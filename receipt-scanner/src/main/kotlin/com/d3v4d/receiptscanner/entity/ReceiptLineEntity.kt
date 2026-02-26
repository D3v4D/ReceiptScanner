package com.d3v4d.receiptscanner.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import java.math.BigDecimal

@Entity
@Table(
    name = "receiptLines"
)
class ReceiptLineEntity (
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    var id: Long = 0,

    @Column(nullable = false)
    var rawName: String = "",

    @Column(nullable = false)
    var quantity: BigDecimal = BigDecimal.ZERO,

    @Column(nullable = false)
    var unit: String = "",

    @Column(nullable = false)
    var unitPrice: BigDecimal = BigDecimal.ZERO,

    @ManyToOne
    @JoinColumn(name = "receipt_id", nullable = false)
    var receipt: ReceiptEntity? = null,

    @ManyToOne
    @JoinColumn(name = "product_id")
    var product: ProductEntity? = null
)