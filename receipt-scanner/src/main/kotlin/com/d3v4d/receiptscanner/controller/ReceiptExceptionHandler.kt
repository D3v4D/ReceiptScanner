package com.d3v4d.receiptscanner.controller

import com.d3v4d.receiptscanner.ReceiptNotFoundException
import com.d3v4d.receiptscanner.service.PythonServiceException
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
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

    @ExceptionHandler(PythonServiceException::class)
    fun onPythonServiceFailure(e: PythonServiceException): ResponseEntity<Map<String, Any>> {
        return ResponseEntity.status(e.status).body(
            mapOf(
                "errorCode" to "PYTHON_SERVICE_ERROR",
                "message" to e.message,
                "status" to e.status.value(),
            ),
        )
    }
}