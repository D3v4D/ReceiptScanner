package com.d3v4d.receiptscanner.service

import com.d3v4d.receiptscanner.ReceiptNotFoundException
import com.d3v4d.receiptscanner.dto.request.ReceiptRequestDTO
import com.d3v4d.receiptscanner.dto.response.ReceiptResponseDTO
import com.d3v4d.receiptscanner.entity.ReceiptEntity
import com.d3v4d.receiptscanner.entity.ReceiptScanStatus
import com.d3v4d.receiptscanner.entity.UserEntity
import com.d3v4d.receiptscanner.filter.ReceiptFilter
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
) {
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

        return receiptRepository
            .save(entity)
            .toDTO()
    }

    @Transactional
    fun updateReceipt(receipt: ReceiptRequestDTO, id: Long?): ReceiptResponseDTO {
        val existing = receiptRepository.findById(id ?: 0).orElse(null)
            ?: throw ReceiptNotFoundException(id ?: 0)
        val user = requireAuthenticatedUser()

        if (existing.user.id != user.id) {
            throw AccessDeniedException("You can only modify your own receipts")
        }

        val updated = receipt.toEntity(user = user, id = existing.id).apply {
            sourceScan = existing.sourceScan
        }
        attachSourceScanIfPresent(updated, user, receipt.scanId)

        return receiptRepository
            .save(updated)
            .toDTO()
    }

    fun deleteReceipt(receiptId: Long) {
        val receipt = receiptRepository.findById(receiptId).orElse(null)
            ?: throw ReceiptNotFoundException(receiptId)

        val user = requireAuthenticatedUser()
        if (receipt.user.id != user.id) {
            throw AccessDeniedException("You can only delete your own receipts")
        }

        receiptRepository.deleteById(receipt.id)
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
}