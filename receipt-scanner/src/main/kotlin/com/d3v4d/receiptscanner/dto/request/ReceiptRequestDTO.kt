package com.d3v4d.receiptscanner.dto.request

import com.fasterxml.jackson.annotation.JsonProperty
import java.math.BigDecimal

data class ReceiptRequestDTO (
    val store: Store,
    @JsonProperty("scan_id")
    val scanId: Long? = null,
    @JsonProperty("purchase_datetime")
    val purchaseDateTime: String,

    @JsonProperty("products")
    val lines: List<ReceiptLineRequestDTO>,

    val total: BigDecimal,
    @JsonProperty("payment_method")
    val paymentMethod: String,
    val currency: String,
)

data class Store (
    val name: String,
    val address: String,
    val taxNumber: Number,
    val chain: String,
)

data class ReceiptLineRequestDTO(
    val name: String,
    val quantity: BigDecimal,   // not int, because we are going to store KG in this field too
    val unit: String,           // unit type (e.g. piece, kg, etc.)
    @JsonProperty("unit_price")
    val unitPrice: BigDecimal,
    @JsonProperty("total_price")
    val totalPrice: BigDecimal,
)
