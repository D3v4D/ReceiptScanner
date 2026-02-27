package com.d3v4d.receiptscanner.controller

import com.d3v4d.receiptscanner.dto.request.ReceiptRequestDTO
import com.d3v4d.receiptscanner.dto.response.ReceiptResponseDTO
import com.d3v4d.receiptscanner.service.ReceiptService
import org.springframework.web.bind.annotation.CrossOrigin
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.math.BigDecimal

@CrossOrigin("*")
@RestController
@RequestMapping("/api/receipts")
class ReceiptController (
    private val receiptService: ReceiptService,
) {
    @GetMapping
    fun getReceipts(
        @RequestParam(value = "id", required = false) id: Long?,
        @RequestParam(value = "include", required = false) include: String?,
        @RequestParam(value = "exclude", required = false) exclude: String?,
        @RequestParam(value = "minPrice", required = false) minPrice: BigDecimal?,
        @RequestParam(value = "maxPrice", required = false) maxPrice: BigDecimal?,
    ): List<ReceiptResponseDTO> {
        return receiptService.getReceipts(
            id = id,
            include = include,
            exclude = exclude,
            minPrice = minPrice,
            maxPrice = maxPrice,
        )
    }

    @PostMapping
    fun postReceipt(
        @RequestBody receiptDto: ReceiptRequestDTO,
    ): ReceiptResponseDTO {
        return receiptService.insertReceipt(receiptDto)
    }

    @PutMapping("/{id}")
    fun putReceipt(
        @PathVariable("id") receiptId: Long,
        @RequestBody receiptDto: ReceiptRequestDTO,
    ): ReceiptResponseDTO {
        return receiptService.updateReceipt(receiptDto, receiptId)
    }

    @DeleteMapping("/{id}")
    fun deleteReceipt(
        @PathVariable("id") receiptId: Long,
    ) {
        receiptService.deleteReceipt(receiptId)
    }
}
