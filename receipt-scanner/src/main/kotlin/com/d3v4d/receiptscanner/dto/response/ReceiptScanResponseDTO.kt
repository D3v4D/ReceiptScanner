package com.d3v4d.receiptscanner.dto.response

import com.fasterxml.jackson.annotation.JsonProperty
import com.fasterxml.jackson.databind.JsonNode

data class ReceiptScanResponseDTO(
    @JsonProperty("scan_id")
    val scanId: Long,
    val payload: JsonNode,
)