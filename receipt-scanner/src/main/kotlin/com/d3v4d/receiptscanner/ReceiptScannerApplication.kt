package com.d3v4d.receiptscanner

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class ReceiptScannerApplication

fun main(args: Array<String>) {
    runApplication<ReceiptScannerApplication>(*args)
}
