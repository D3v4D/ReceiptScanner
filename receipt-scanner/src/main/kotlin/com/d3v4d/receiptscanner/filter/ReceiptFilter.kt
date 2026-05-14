package com.d3v4d.receiptscanner.filter

import java.math.BigDecimal

class ReceiptFilter (
    val id: Long? = null,
    val minPrice: BigDecimal? = null,
    val maxPrice: BigDecimal? = null,
    val includeProduct: String? = null,
    val excludeProduct: String? = null
)