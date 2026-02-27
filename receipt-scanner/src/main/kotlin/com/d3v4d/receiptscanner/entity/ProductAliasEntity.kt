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

// ...existing code...
@Entity
@Table(name = "product_alias")
class ProductAliasEntity(
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "product_alias_gen")
    @SequenceGenerator(name = "product_alias_gen", sequenceName = "product_alias_seq", allocationSize = 1)
    var id: Long = 0,

    @Column(nullable = false)
    var alias: String = "",

    @Column(nullable = false)
    var confidence: Int = 0,

    @ManyToOne
    @JoinColumn(name = "product_id", nullable = false)
    var product: ProductEntity? = null,
)