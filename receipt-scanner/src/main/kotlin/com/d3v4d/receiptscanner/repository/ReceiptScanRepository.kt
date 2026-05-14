package com.d3v4d.receiptscanner.repository

import com.d3v4d.receiptscanner.entity.ReceiptScanEntity
import org.springframework.data.jpa.repository.JpaRepository

interface ReceiptScanRepository : JpaRepository<ReceiptScanEntity, Long> {
    fun findByIdAndUserId(id: Long, userId: Long): ReceiptScanEntity?
}