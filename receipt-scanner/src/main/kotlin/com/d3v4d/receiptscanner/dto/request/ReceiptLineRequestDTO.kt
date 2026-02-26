package com.d3v4d.receiptscanner.dto.request

import java.math.BigDecimal

data class ReceiptLineRequestDTO(
    val name: String,
    val quantity: BigDecimal,   // not int, because we are going to store KG in this field too
    val unit: String,           // unit type (e.g. piece, kg, etc.)
    val unitPrice: BigDecimal,
)
