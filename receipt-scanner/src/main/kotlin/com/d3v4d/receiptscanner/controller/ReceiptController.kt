package com.d3v4d.receiptscanner.controller

import com.d3v4d.receiptscanner.dto.request.ReceiptRequestDTO
import com.d3v4d.receiptscanner.dto.request.ReceiptLineRequestDTO
import com.d3v4d.receiptscanner.dto.response.ReceiptScanResponseDTO
import com.d3v4d.receiptscanner.dto.response.ReceiptResponseDTO
import com.d3v4d.receiptscanner.service.ReceiptScanService
import com.d3v4d.receiptscanner.service.ReceiptService
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile
import org.springframework.web.server.ResponseStatusException
import org.slf4j.LoggerFactory
import java.math.BigDecimal

@RestController
@RequestMapping("/api/receipts")
class ReceiptController (
    private val receiptService: ReceiptService,
    private val receiptScanService: ReceiptScanService,
) {
    private val logger = LoggerFactory.getLogger(ReceiptController::class.java)

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

    @PostMapping("/{id}/items")
    fun appendReceiptItems(
        @PathVariable("id") receiptId: Long,
        @RequestBody items: List<ReceiptLineRequestDTO>,
    ): ReceiptResponseDTO {
        return receiptService.appendReceiptItems(receiptId, items)
    }

    @DeleteMapping("/{id}")
    fun deleteReceipt(
        @PathVariable("id") receiptId: Long,
    ) {
        receiptService.deleteReceipt(receiptId)
    }

    @GetMapping("/{id}/image")
    fun getReceiptImage(
        @PathVariable("id") receiptId: Long,
    ): ResponseEntity<ByteArray> {
        val image = receiptService.getReceiptImage(receiptId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "No image found for receipt")

        val mediaType = runCatching { MediaType.parseMediaType(image.contentType) }
            .getOrDefault(MediaType.APPLICATION_OCTET_STREAM)

        return ResponseEntity.ok()
            .contentType(mediaType)
            .body(image.bytes)
    }

    @PostMapping("/scan", consumes = ["multipart/form-data"])
    fun scanReceipt(
        @RequestParam("image") image: MultipartFile,
    ): ResponseEntity<ReceiptScanResponseDTO> {
        logger.info(
            "Received receipt scan request: filename={}, contentType={}, size={} bytes",
            image.originalFilename,
            image.contentType,
            image.size,
        )
        return ResponseEntity.ok(receiptScanService.scanReceipt(image))
    }
}
