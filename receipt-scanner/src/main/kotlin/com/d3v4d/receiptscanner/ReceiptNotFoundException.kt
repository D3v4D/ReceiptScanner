package com.d3v4d.receiptscanner

class ReceiptNotFoundException (
    private val id: Long?
): RuntimeException(
    "Receipt not found for id $id"
)