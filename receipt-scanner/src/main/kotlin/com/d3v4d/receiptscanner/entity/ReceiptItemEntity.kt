package com.d3v4d.receiptscanner.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.SequenceGenerator
import jakarta.persistence.Table
import java.math.BigDecimal

@Entity
@Table(name = "receiptLines")
class ReceiptItemEntity (
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "receipt_lines_gen")
    @SequenceGenerator(name = "receipt_lines_gen", sequenceName = "receipt_lines_seq", allocationSize = 1)
    var id: Long = 0,

    @Column(nullable = false)
    var name: String = "",

    @Column(nullable = false)
    var quantity: BigDecimal = BigDecimal.ZERO,

    @Column(nullable = false)
    var unit: String = "",

    @Column(nullable = false)
    var unitPrice: BigDecimal = BigDecimal.ZERO,

    @Column(nullable = false)
    var totalPrice: BigDecimal = BigDecimal.ZERO,

    @ManyToOne
    @JoinColumn(name = "receipt_id", nullable = false)
    var receipt: ReceiptEntity? = null,

    @ManyToOne
    @JoinColumn(name = "category_id", nullable = true)
    var category: CategoryEntity? = null,

)