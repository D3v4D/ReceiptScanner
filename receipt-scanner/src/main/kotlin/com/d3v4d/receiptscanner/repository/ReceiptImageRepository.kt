package com.d3v4d.receiptscanner.repository

import com.d3v4d.receiptscanner.entity.ReceiptImageEntity
import org.springframework.data.jpa.repository.JpaRepository

interface ReceiptImageRepository : JpaRepository<ReceiptImageEntity, Long>