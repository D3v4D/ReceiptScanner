package com.d3v4d.receiptscanner.dto.response

import java.math.BigDecimal

data class ReceiptLineResponseDTO(
    val id: Long,
    val name: String,
    val quantity: String,    // not int, because we are going to store KG in this field too
    val unit: String,        // unit type (e.g. 1 = piece, 2 = kg, etc.)
    val unitPrice: BigDecimal,
    val category: CategoryResponseDTO? = null,
)
