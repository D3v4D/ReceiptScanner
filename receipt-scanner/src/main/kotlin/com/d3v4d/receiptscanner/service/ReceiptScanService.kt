package com.d3v4d.receiptscanner.service

import com.d3v4d.receiptscanner.dto.response.ReceiptScanResponseDTO
import com.d3v4d.receiptscanner.entity.ReceiptImageEntity
import com.d3v4d.receiptscanner.entity.ReceiptScanEntity
import com.d3v4d.receiptscanner.entity.ReceiptScanStatus
import com.d3v4d.receiptscanner.entity.UserEntity
import com.d3v4d.receiptscanner.repository.ReceiptImageRepository
import com.d3v4d.receiptscanner.repository.ReceiptScanRepository
import com.d3v4d.receiptscanner.repository.UserRepository
import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.node.JsonNodeFactory
import org.springframework.http.HttpStatusCode
import org.springframework.security.access.AccessDeniedException
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.multipart.MultipartFile
import java.security.MessageDigest
import java.time.Instant

@Service
class ReceiptScanService(
    private val pythonClient: PythonClient,
    private val receiptImageRepository: ReceiptImageRepository,
    private val receiptScanRepository: ReceiptScanRepository,
    private val userRepository: UserRepository,
) {
    private val objectMapper = ObjectMapper()

    @Transactional(noRollbackFor = [PythonServiceException::class])
    fun scanReceipt(image: MultipartFile): ReceiptScanResponseDTO {
        val user = requireAuthenticatedUser()
        val imageBytes = image.bytes

        val imageEntity = receiptImageRepository.save(
            ReceiptImageEntity(
                user = user,
                contentType = image.contentType ?: "application/octet-stream",
                fileName = image.originalFilename,
                sizeBytes = image.size,
                sha256 = sha256Hex(imageBytes),
                imageData = imageBytes,
                createdAt = Instant.now(),
            ),
        )

        val pythonResponse = pythonClient.sendImage(image)
        val payloadNode = parseJsonBody(pythonResponse.body)

        val scanEntity = receiptScanRepository.save(
            ReceiptScanEntity(
                user = user,
                image = imageEntity,
                status = if (pythonResponse.statusCode in 200..299) {
                    ReceiptScanStatus.DRAFT
                } else {
                    ReceiptScanStatus.FAILED
                },
                rawProviderResponse = pythonResponse.body,
                normalizedPayload = extractNormalizedPayload(payloadNode),
                ocrText = payloadNode.path("ocr_text").asText().takeIf { it.isNotBlank() },
                llmMeta = payloadNode.path("llm_meta").takeIf { !it.isMissingNode && !it.isNull }?.toString(),
                failedAttempts = payloadNode.path("failed_attempts").takeIf { it.canConvertToInt() }?.asInt(),
                errorMessage = if (pythonResponse.statusCode >= 400) {
                    pythonResponse.body.ifBlank { "Python service returned an error" }
                } else {
                    null
                },
                createdAt = Instant.now(),
            ),
        )

        if (pythonResponse.statusCode >= 400) {
            throw PythonServiceException(
                status = HttpStatusCode.valueOf(pythonResponse.statusCode),
                message = pythonResponse.body.ifBlank { "Python service returned an error" },
                scanId = scanEntity.id,
            )
        }

        return ReceiptScanResponseDTO(
            scanId = scanEntity.id,
            payload = payloadNode,
        )
    }

    private fun parseJsonBody(body: String): JsonNode {
        return try {
            objectMapper.readTree(body)
        } catch (_: Exception) {
            JsonNodeFactory.instance.objectNode().put("raw_response", body)
        }
    }

    private fun extractNormalizedPayload(payloadNode: JsonNode): String? {
        val formattedJson = payloadNode.path("formatted_json")
        if (!formattedJson.isMissingNode && !formattedJson.isNull) {
            return formattedJson.toString()
        }

        val formattedText = payloadNode.path("formatted_text").asText().trim()
        if (formattedText.isBlank()) {
            return null
        }

        return try {
            objectMapper.readTree(formattedText).toString()
        } catch (_: Exception) {
            null
        }
    }

    private fun sha256Hex(bytes: ByteArray): String {
        val digest = MessageDigest.getInstance("SHA-256").digest(bytes)
        return digest.joinToString(separator = "") { b -> "%02x".format(b) }
    }

    private fun requireAuthenticatedUser(): UserEntity {
        val authentication = SecurityContextHolder.getContext().authentication
            ?: throw AccessDeniedException("Authentication required")
        if (!authentication.isAuthenticated || authentication.principal == "anonymousUser") {
            throw AccessDeniedException("Authentication required")
        }

        val username = when (val principal = authentication.principal) {
            is UserDetails -> principal.username
            is String -> principal
            else -> throw AccessDeniedException("Invalid authentication principal")
        }

        return userRepository.findByUsername(username)
            ?: throw AccessDeniedException("Authenticated user not found")
    }
}

