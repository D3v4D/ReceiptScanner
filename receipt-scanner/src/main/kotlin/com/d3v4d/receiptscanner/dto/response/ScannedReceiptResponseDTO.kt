package com.d3v4d.receiptscanner.dto.response

import com.fasterxml.jackson.annotation.JsonProperty
import java.math.BigDecimal

data class ScannedReceiptResponseDTO(
    val store: ScannedStoreDTO,
    @JsonProperty("purchase_datetime")
    val purchaseDatetime: String,
    val products: List<ScannedProductDTO>,
    val total: BigDecimal,
    @JsonProperty("payment_method")
    val paymentMethod: String,
    val currency: String,
)

data class ScannedStoreDTO(
    val name: String,
    val address: String,
    val chain: String,
)

data class ScannedProductDTO(
    val name: String,
    val quantity: BigDecimal,
    val unit: String,
    @JsonProperty("unit_price")
    val unitPrice: BigDecimal,
    @JsonProperty("total_price")
    val totalPrice: BigDecimal,
)

