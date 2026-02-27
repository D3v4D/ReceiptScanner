package com.d3v4d.receiptscanner.repository

import com.d3v4d.receiptscanner.entity.ProductEntity
import org.springframework.data.jpa.repository.JpaRepository

interface ProductRepository : JpaRepository<ProductEntity, Long>

