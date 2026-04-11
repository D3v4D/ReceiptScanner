package com.d3v4d.receiptscanner.service

import org.springframework.stereotype.Service
import org.springframework.web.multipart.MultipartFile

@Service
class ReceiptScanService(
    private val pythonClient: PythonClient,
) {
    fun scanReceipt(image: MultipartFile): String {
        return pythonClient.sendImage(image)
    }
}

