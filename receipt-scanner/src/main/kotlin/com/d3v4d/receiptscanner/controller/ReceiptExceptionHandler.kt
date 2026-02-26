package com.d3v4d.receiptscanner.controller

import com.d3v4d.receiptscanner.ReceiptNotFoundException
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestControllerAdvice

@RestControllerAdvice
class ReceiptExceptionHandler {

    @ExceptionHandler(ReceiptNotFoundException::class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    fun onReceiptNotFound(e: ReceiptNotFoundException) = mapOf(
        "errorCode" to "QUOTE_NOT_FOUND",
        "message" to e.message
    )
}