package com.d3v4d.receiptscanner.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.OneToOne
import jakarta.persistence.SequenceGenerator
import jakarta.persistence.Table
import java.time.Instant

@Entity
@Table(name = "receipt_scans")
class ReceiptScanEntity(
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "receipt_scans_gen")
    @SequenceGenerator(name = "receipt_scans_gen", sequenceName = "receipt_scans_seq", allocationSize = 1)
    var id: Long = 0,

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    var user: UserEntity = UserEntity(),

    @ManyToOne
    @JoinColumn(name = "image_id", nullable = false)
    var image: ReceiptImageEntity = ReceiptImageEntity(),

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    var status: ReceiptScanStatus = ReceiptScanStatus.DRAFT,

    @Column(nullable = false, columnDefinition = "TEXT")
    var rawProviderResponse: String = "",

    @Column(columnDefinition = "TEXT")
    var normalizedPayload: String? = null,

    @Column(columnDefinition = "TEXT")
    var ocrText: String? = null,

    @Column(columnDefinition = "TEXT")
    var llmMeta: String? = null,

    @Column
    var failedAttempts: Int? = null,

    @Column(columnDefinition = "TEXT")
    var errorMessage: String? = null,

    @Column(nullable = false)
    var createdAt: Instant = Instant.now(),

    @Column
    var finalizedAt: Instant? = null,

    @OneToOne(mappedBy = "sourceScan")
    var receipt: ReceiptEntity? = null,
)