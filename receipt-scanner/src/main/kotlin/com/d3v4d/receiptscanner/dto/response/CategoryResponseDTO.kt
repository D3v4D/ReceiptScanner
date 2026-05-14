package com.d3v4d.receiptscanner.dto.response

data class CategoryResponseDTO(
    val id: Long,
    val name: String,
    val description: String? = null,
)
