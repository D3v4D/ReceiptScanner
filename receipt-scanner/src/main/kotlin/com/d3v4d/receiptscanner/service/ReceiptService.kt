package com.d3v4d.receiptscanner.service

import com.d3v4d.receiptscanner.ReceiptNotFoundException
import com.d3v4d.receiptscanner.UserNotFoundException
import com.d3v4d.receiptscanner.dto.request.ReceiptRequestDTO
import com.d3v4d.receiptscanner.dto.response.ReceiptResponseDTO
import com.d3v4d.receiptscanner.filter.ReceiptFilter
import com.d3v4d.receiptscanner.repository.ReceiptRepository
import com.d3v4d.receiptscanner.repository.UserRepository
import com.d3v4d.receiptscanner.specification.ReceiptSpecification
import org.springframework.stereotype.Service
import java.math.BigDecimal

@Service
class ReceiptService(
    private val receiptRepository: ReceiptRepository,
    private val userRepository: UserRepository,
    private val fuzzyProductMatchService: FuzzyProductMatchService,
) {
    fun getReceipts(
        id: Long?,
        include: String?,
        exclude: String?,
        minPrice: BigDecimal? = null,
        maxPrice: BigDecimal? = null,
    ): List<ReceiptResponseDTO> {
        // TODO: replace hardcoded userId=1 with the authenticated principal once security is in place
        val user = userRepository.findById(1L).orElse(null)
            ?: throw UserNotFoundException(1L)

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

    fun insertReceipt(receipt: ReceiptRequestDTO): ReceiptResponseDTO {
        val user = userRepository.findById(receipt.userId).orElse(null)
            ?: throw UserNotFoundException(receipt.userId)

        // Fuzzy-match every line's raw OCR name to a known (or newly created) product
        val products = receipt.lines.map { line ->
            fuzzyProductMatchService.resolve(line.name)
        }

        return receiptRepository
            .save(receipt.toEntity(user = user, products = products))
            .toDTO()
    }

    fun updateReceipt(receipt: ReceiptRequestDTO, id: Long?): ReceiptResponseDTO {
        val existing = receiptRepository.findById(id ?: 0).orElse(null)
            ?: throw ReceiptNotFoundException(id ?: 0)

        val user = userRepository.findById(receipt.userId).orElse(null)
            ?: throw UserNotFoundException(receipt.userId)

        val products = receipt.lines.map { line ->
            fuzzyProductMatchService.resolve(line.name)
        }

        return receiptRepository
            .save(receipt.toEntity(user = user, id = existing.id, products = products))
            .toDTO()
    }

    fun deleteReceipt(receiptId: Long) {
        val receipt = receiptRepository.findById(receiptId).orElse(null)
            ?: throw ReceiptNotFoundException(receiptId)
        receiptRepository.deleteById(receipt.id)
    }
}