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
@Table(name = "store")
class StoreEntity (
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "store_gen")
    @SequenceGenerator(name = "store_gen", sequenceName = "store_seq", allocationSize = 1)
    var id: Long = 0,

    @Column(nullable = false)
    var name: String = "",

    @Column(nullable = false)
    var address: String = "",

    @Column
    var storeChain: String? = null
)