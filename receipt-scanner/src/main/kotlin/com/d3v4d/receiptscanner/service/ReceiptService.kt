package com.d3v4d.receiptscanner.service

import com.d3v4d.receiptscanner.ReceiptNotFoundException
import com.d3v4d.receiptscanner.UserNotFoundException
import com.d3v4d.receiptscanner.dto.request.ReceiptRequestDTO
import com.d3v4d.receiptscanner.dto.response.ReceiptResponseDTO
import com.d3v4d.receiptscanner.repository.ReceiptRepository
import com.d3v4d.receiptscanner.repository.UserRepository
import com.d3v4d.receiptscanner.entity.StoreEntity
import com.d3v4d.receiptscanner.entity.UserEntity

import org.springframework.stereotype.Service

@Service
class ReceiptService(
    private val receiptRepository: ReceiptRepository,
    private val userRepository: UserRepository,
) {
    fun getReceipts(
        id: Long?,
        minPrice: Int?,
        maxPrice: Int?,
        includeProduct: String?,
        excludeProduct: String?,
        user: UserEntity
        ) : List<ReceiptResponseDTO> {
        return if (id == null && minPrice == null && maxPrice == null) {
            receiptRepository
                .findAll()
                .map { it.toDTO() }
        } else if (id != null) {
            listOf(
                receiptRepository
                    .findById(id)
                    .orElseThrow { ReceiptNotFoundException(id) }
                    .toDTO()
            )
        }
        else if (include != null){

        }

    }

    fun insertReceipt(receipt: ReceiptRequestDTO) : ReceiptResponseDTO {
        return receiptRepository
            .save(
                receipt.toEntity(
                    user = userRepository
                        .findById(receipt.userId)
                        .orElseThrow {
                            UserNotFoundException(receipt.userId)
                        },
                    products = TODO()
                )
            )
            .toDTO()
    }

    fun updateReceipt(receipt: ReceiptRequestDTO, id : Long?) : ReceiptResponseDTO =
        receiptRepository
            .findById(id?:0)
            .orElseThrow { ReceiptNotFoundException(id?:0) }
            .let {
                receiptRepository.save(
                    receipt.toEntity(
                        user = userRepository
                            .findById(receipt.userId)
                            .orElseThrow {
                                UserNotFoundException(receipt.userId)
                            },
                        id = it.id
                    )
                )
            }
            .toDTO()

    fun deleteReceipt(receiptId: Long) {
        receiptRepository
            .deleteById(
                receiptRepository
                    .findById(receiptId)
                    .orElseThrow { ReceiptNotFoundException(receiptId) }
                    .id
            )
    }
}