package com.d3v4d.receiptscanner

class UserNotFoundException(
    private val id: Long
): RuntimeException(
    "User not found for id $id"
)