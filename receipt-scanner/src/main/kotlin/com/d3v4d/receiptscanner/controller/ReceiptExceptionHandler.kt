package com.d3v4d.receiptscanner.controller

import com.d3v4d.receiptscanner.ReceiptNotFoundException
import com.d3v4d.receiptscanner.service.PythonServiceException
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.AccessDeniedException
import org.springframework.security.core.AuthenticationException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestControllerAdvice
import java.time.format.DateTimeParseException

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
        val body = mutableMapOf<String, Any>(
            "errorCode" to "PYTHON_SERVICE_ERROR",
            "message" to e.message,
            "status" to e.status.value(),
        )
        if (e.scanId != null) {
            body["scan_id"] = e.scanId
        }

        return ResponseEntity.status(e.status).body(body)
    }

    @ExceptionHandler(AuthenticationException::class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    fun onAuthenticationFailure(e: AuthenticationException) = mapOf(
        "errorCode" to "UNAUTHORIZED",
        "message" to (e.message ?: "Authentication failed"),
    )

    @ExceptionHandler(AccessDeniedException::class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    fun onAccessDenied(e: AccessDeniedException) = mapOf(
        "errorCode" to "FORBIDDEN",
        "message" to (e.message ?: "Access denied"),
    )

    @ExceptionHandler(DataIntegrityViolationException::class)
    @ResponseStatus(HttpStatus.CONFLICT)
    fun onDataIntegrityViolation(e: DataIntegrityViolationException) = mapOf(
        "errorCode" to "CONFLICT",
        "message" to "Username or email is already in use",
    )

    @ExceptionHandler(IllegalArgumentException::class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    fun onIllegalArgument(e: IllegalArgumentException) = mapOf(
        "errorCode" to "INVALID_REQUEST",
        "message" to (e.message ?: "Invalid request payload"),
    )

    @ExceptionHandler(DateTimeParseException::class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    fun onDateTimeParse(e: DateTimeParseException) = mapOf(
        "errorCode" to "INVALID_REQUEST",
        "message" to "Invalid purchase_datetime format",
    )
}