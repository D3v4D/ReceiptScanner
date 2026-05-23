package com.d3v4d.receiptscanner.service

import com.d3v4d.receiptscanner.ReceiptNotFoundException
import com.d3v4d.receiptscanner.dto.request.ReceiptLineRequestDTO
import com.d3v4d.receiptscanner.dto.request.ReceiptRequestDTO
import com.d3v4d.receiptscanner.dto.response.ReceiptResponseDTO
import com.d3v4d.receiptscanner.entity.ReceiptEntity
import com.d3v4d.receiptscanner.entity.ReceiptScanStatus
import com.d3v4d.receiptscanner.entity.UserEntity
import com.d3v4d.receiptscanner.filter.ReceiptFilter
import com.d3v4d.receiptscanner.repository.CategoryRepository
import com.d3v4d.receiptscanner.repository.ReceiptRepository
import com.d3v4d.receiptscanner.repository.ReceiptScanRepository
import com.d3v4d.receiptscanner.repository.UserRepository
import com.d3v4d.receiptscanner.specification.ReceiptSpecification
import org.springframework.security.access.AccessDeniedException
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.time.Instant

@Service
class ReceiptService(
    private val receiptRepository: ReceiptRepository,
    private val receiptScanRepository: ReceiptScanRepository,
    private val userRepository: UserRepository,
    private val categoryRepository: CategoryRepository,
) {
    data class ReceiptImagePayload(
        val bytes: ByteArray,
        val contentType: String,
    )

    private fun requireAuthenticatedUser(): UserEntity {
        val authentication = SecurityContextHolder.getContext().authentication
            ?: throw AccessDeniedException("Authentication required")
        if (!authentication.isAuthenticated || authentication.principal == "anonymousUser") {
            throw AccessDeniedException("Authentication required")
        }

        val username = when (val principal = authentication.principal) {
            is UserDetails -> principal.username
            is String -> principal
            else -> throw AccessDeniedException("Invalid authentication principal")
        }

        return userRepository.findByUsername(username)
            ?: throw AccessDeniedException("Authenticated user not found")
    }

    fun getReceipts(
        id: Long?,
        include: String?,
        exclude: String?,
        minPrice: BigDecimal? = null,
        maxPrice: BigDecimal? = null,
    ): List<ReceiptResponseDTO> {
        val user = requireAuthenticatedUser()

        val filter = ReceiptFilter(
            id = id,
            includeProduct = include,
            excludeProduct = exclude,
            minPrice = minPrice,
            maxPrice = maxPrice,
        )

        return receiptRepository
            .findAll(ReceiptSpecification.build(filter, user))
            .map { it.toDTO() }
    }

    @Transactional
    fun insertReceipt(receipt: ReceiptRequestDTO): ReceiptResponseDTO {
        val user = requireAuthenticatedUser()
        val entity = receipt.toEntity(user = user)
        attachSourceScanIfPresent(entity, user, receipt.scanId)
        assignCategoriesToLines(entity, receipt.lines, user)

        return receiptRepository
            .save(entity)
            .toDTO()
    }

    @Transactional
    fun updateReceipt(receipt: ReceiptRequestDTO, id: Long?): ReceiptResponseDTO {
        val user = requireAuthenticatedUser()

        val receiptId = id ?: 0L
        val existing = receiptRepository.findByIdAndUserId(receiptId, user.id)
            ?: throw ReceiptNotFoundException(receiptId)

        val updated = receipt.toEntity(user = user, id = existing.id).apply {
            sourceScan = existing.sourceScan
        }
        attachSourceScanIfPresent(updated, user, receipt.scanId)
        assignCategoriesToLines(updated, receipt.lines, user)

        return receiptRepository
            .save(updated)
            .toDTO()
    }

    @Transactional
    fun appendReceiptItems(receiptId: Long, items: List<ReceiptLineRequestDTO>): ReceiptResponseDTO {
        val user = requireAuthenticatedUser()

        val receipt = receiptRepository.findByIdAndUserId(receiptId, user.id)
            ?: throw ReceiptNotFoundException(receiptId)

        if (items.isEmpty()) {
            throw IllegalArgumentException("At least one receipt item must be provided")
        }

        val previousLineCount = receipt.lines.size
        receipt.lines.addAll(items.map { it.toEntity(receipt) })
        
        // Assign categories to the newly added lines
        for ((index, lineRequest) in items.withIndex()) {
            if (lineRequest.categoryId != null) {
                val category = categoryRepository.findByIdAndUserId(lineRequest.categoryId, user.id)
                    ?: throw IllegalArgumentException("Category not found or access denied: ${lineRequest.categoryId}")
                receipt.lines[previousLineCount + index].category = category
            }
        }

        receipt.total = receipt.lines.fold(BigDecimal.ZERO) { sum, line -> sum + line.totalPrice }

        return receiptRepository
            .save(receipt)
            .toDTO()
    }

    @Transactional
    fun deleteReceipt(receiptId: Long) {
        val user = requireAuthenticatedUser()

        val receipt = receiptRepository.findByIdAndUserId(receiptId, user.id)
            ?: throw ReceiptNotFoundException(receiptId)

        // Detach linked scan metadata first so the scan can be reused and to avoid
        // relational state inconsistencies when the receipt row is removed.
        receipt.sourceScan?.let { scan ->
            scan.receipt = null
            scan.status = ReceiptScanStatus.DRAFT
            scan.finalizedAt = null
        }
        receipt.sourceScan = null

        receiptRepository.delete(receipt)
    }

    @Transactional(readOnly = true)
    fun getReceiptImage(receiptId: Long): ReceiptImagePayload? {
        val user = requireAuthenticatedUser()

        val receipt = receiptRepository.findByIdAndUserId(receiptId, user.id)
            ?: throw ReceiptNotFoundException(receiptId)

        val image = receipt.sourceScan?.image ?: return null
        return ReceiptImagePayload(
            bytes = image.imageData,
            contentType = image.contentType,
        )
    }

    private fun attachSourceScanIfPresent(receipt: ReceiptEntity, user: UserEntity, scanId: Long?) {
        if (scanId == null) {
            return
        }

        val scan = receiptScanRepository.findByIdAndUserId(scanId, user.id)
            ?: throw AccessDeniedException("Scan not found for the authenticated user")

        val linkedReceipt = scan.receipt
        if (linkedReceipt != null && linkedReceipt.id != receipt.id) {
            throw AccessDeniedException("This scan is already linked to another receipt")
        }

        scan.status = ReceiptScanStatus.FINALIZED
        scan.finalizedAt = Instant.now()
        receipt.sourceScan = scan
    }

    private fun assignCategoriesToLines(receipt: ReceiptEntity, lineRequests: List<ReceiptLineRequestDTO>, user: UserEntity) {
        val categoriesById = mutableMapOf<Long, Long>() // cache categoryId to user check
        
        for ((index, lineRequest) in lineRequests.withIndex()) {
            if (index < receipt.lines.size && lineRequest.categoryId != null) {
                // Verify the category exists and belongs to the user
                val category = categoryRepository.findByIdAndUserId(lineRequest.categoryId, user.id)
                    ?: throw IllegalArgumentException("Category not found or access denied: ${lineRequest.categoryId}")
                receipt.lines[index].category = category
            }
        }
    }
}