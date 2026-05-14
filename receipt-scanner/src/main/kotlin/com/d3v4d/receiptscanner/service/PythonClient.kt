package com.d3v4d.receiptscanner.service

import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.http.MediaType
import org.springframework.http.client.MultipartBodyBuilder
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.web.reactive.function.BodyInserters
import org.springframework.web.reactive.function.client.WebClient
import org.springframework.web.reactive.function.client.WebClientRequestException
import org.springframework.web.multipart.MultipartFile
import org.springframework.core.io.ByteArrayResource
import org.slf4j.LoggerFactory
import reactor.core.publisher.Mono

data class PythonClientResponse(
    val statusCode: Int,
    val body: String,
)

@Service
class PythonClient(
    @Value("\${python-service.base-url:http://localhost:8000}") baseUrl: String,
) {
    private val logger = LoggerFactory.getLogger(PythonClient::class.java)
    private val objectMapper = ObjectMapper()

    private val webClient = WebClient.create(baseUrl)

    fun sendImage(file: MultipartFile): PythonClientResponse {

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
                .exchangeToMono { clientResponse ->
                    clientResponse.bodyToMono(String::class.java)
                        .defaultIfEmpty("")
                        .map { body ->
                            PythonClientResponse(
                                statusCode = clientResponse.statusCode().value(),
                                body = body,
                            )
                        }
                }
                .onErrorResume { Mono.error(it) }
                .block() ?: throw IllegalStateException("Python service returned an empty response")
        } catch (e: WebClientRequestException) {
            logger.error("Failed to reach Python service: {}", e.message)
            throw PythonServiceException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE, "Python service is unavailable")
        }

        if (response.statusCode >= 400) {
            logger.warn(
                "Python service request failed with status {}: {}",
                response.statusCode,
                extractErrorMessage(response.body),
            )
        } else {
            logger.info("Python service returned scan response ({} chars)", response.body.length)
        }

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