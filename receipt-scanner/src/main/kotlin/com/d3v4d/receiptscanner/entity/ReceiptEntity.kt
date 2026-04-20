package com.d3v4d.receiptscanner.entity

import jakarta.persistence.CascadeType
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.OneToMany
import jakarta.persistence.OneToOne
import jakarta.persistence.SequenceGenerator
import jakarta.persistence.Table
import java.time.Instant

@Entity
@Table(name = "receipts")
class ReceiptEntity (
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "receipts_gen")
    @SequenceGenerator(name = "receipts_gen", sequenceName = "receipts_seq", allocationSize = 1)
    var id: Long = 0,


    @Column(nullable = false)
    var purchaseDateTime: Instant = Instant.now(),

    @Column(nullable = false, length = 3)
    var currency: String = "HUF",

    @OneToMany(
        mappedBy = "receipt",
        cascade = [CascadeType.ALL],
        orphanRemoval = true
    )
    var lines: MutableList<ReceiptItemEntity> = mutableListOf(),

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    var user: UserEntity = UserEntity(),

    @ManyToOne(cascade = [CascadeType.PERSIST, CascadeType.MERGE])
    @JoinColumn(name = "store_id")
    var store: StoreEntity? = null,

    @OneToOne
    @JoinColumn(name = "source_scan_id", unique = true)
    var sourceScan: ReceiptScanEntity? = null,
)