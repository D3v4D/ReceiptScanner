package com.d3v4d.receiptscanner.service

import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.http.MediaType
import org.springframework.http.client.MultipartBodyBuilder
import org.springframework.http.HttpStatus
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.web.reactive.function.BodyInserters
import org.springframework.web.reactive.function.client.WebClient
import org.springframework.web.reactive.function.client.WebClientRequestException
import org.springframework.web.multipart.MultipartFile
import org.springframework.web.reactive.function.client.bodyToMono
import org.springframework.core.io.ByteArrayResource
import org.slf4j.LoggerFactory

@Service
class PythonClient(
    @Value("\${python-service.base-url:http://localhost:8000}") baseUrl: String,
) {
    private val logger = LoggerFactory.getLogger(PythonClient::class.java)
    private val objectMapper = ObjectMapper()

    private val webClient = WebClient.create(baseUrl)

    fun sendImage(file: MultipartFile): String {

        val builder = MultipartBodyBuilder()
        val imageResource = object : ByteArrayResource(file.bytes) {
            override fun getFilename(): String {
                return file.originalFilename ?: "image"
            }
        }

        builder.part("file", imageResource)
            .filename(file.originalFilename ?: "image")
            .contentType(file.contentType?.let { MediaType.parseMediaType(it) } ?: MediaType.APPLICATION_OCTET_STREAM)

        logger.info(
            "Calling Python service for receipt scan: filename={}, contentType={}, size={} bytes",
            file.originalFilename,
            file.contentType,
            file.size,
        )

        val response = try {
            webClient.post()
                .uri("/extract")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(BodyInserters.fromMultipartData(builder.build()))
                .retrieve()
                .onStatus({ status -> status.isError }) { clientResponse ->
                    clientResponse.bodyToMono<String>()
                        .defaultIfEmpty("Python service returned an error response")
                        .map { body ->
                            val message = extractErrorMessage(body)
                            logger.warn(
                                "Python service request failed with status {}: {}",
                                clientResponse.statusCode().value(),
                                message,
                            )
                            PythonServiceException(clientResponse.statusCode(), message)
                        }
                }
                .bodyToMono<String>()
                .block() ?: throw IllegalStateException("Python service returned an empty response body")
        } catch (e: WebClientRequestException) {
            logger.error("Failed to reach Python service: {}", e.message)
            throw PythonServiceException(HttpStatus.SERVICE_UNAVAILABLE, "Python service is unavailable")
        }

        logger.info("Python service returned scan response ({} chars)", response.length)
        return response
    }

    private fun extractErrorMessage(body: String): String {
        return try {
            val detail = objectMapper.readTree(body).path("detail").asText()
            if (detail.isBlank()) body else detail
        } catch (_: Exception) {
            body
        }
    }
}