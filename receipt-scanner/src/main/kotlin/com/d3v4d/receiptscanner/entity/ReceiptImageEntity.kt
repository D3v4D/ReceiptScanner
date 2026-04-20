package com.d3v4d.receiptscanner.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.Lob
import jakarta.persistence.ManyToOne
import jakarta.persistence.SequenceGenerator
import jakarta.persistence.Table
import java.time.Instant

@Entity
@Table(name = "receipt_images")
class ReceiptImageEntity(
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "receipt_images_gen")
    @SequenceGenerator(name = "receipt_images_gen", sequenceName = "receipt_images_seq", allocationSize = 1)
    var id: Long = 0,

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    var user: UserEntity = UserEntity(),

    @Column(nullable = false, length = 100)
    var contentType: String = "application/octet-stream",

    @Column(length = 255)
    var fileName: String? = null,

    @Column(nullable = false)
    var sizeBytes: Long = 0,

    @Column(nullable = false, length = 64)
    var sha256: String = "",

    @Lob
    @Column(nullable = false)
    var imageData: ByteArray = byteArrayOf(),

    @Column(nullable = false)
    var createdAt: Instant = Instant.now(),
)