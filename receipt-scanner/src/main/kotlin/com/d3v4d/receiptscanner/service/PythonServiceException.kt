package com.d3v4d.receiptscanner.service

import org.springframework.http.HttpStatusCode

class PythonServiceException(
    val status: HttpStatusCode,
    override val message: String,
) : RuntimeException(message)