package com.d3v4d.receiptscanner.repository

import com.d3v4d.receiptscanner.entity.CategoryEntity
import org.springframework.data.jpa.repository.JpaRepository

interface CategoryRepository : JpaRepository<CategoryEntity, Long> {

    fun findByIdAndUserId(id: Long, userId: Long): CategoryEntity?

    fun findAllByUserId(userId: Long): List<CategoryEntity>

}
