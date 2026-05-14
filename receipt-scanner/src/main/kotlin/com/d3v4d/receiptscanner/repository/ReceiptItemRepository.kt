package com.d3v4d.receiptscanner.repository

import com.d3v4d.receiptscanner.entity.ReceiptItemEntity
import org.springframework.data.jpa.repository.JpaRepository

interface ReceiptItemRepository: JpaRepository<ReceiptItemEntity, Long> {

}