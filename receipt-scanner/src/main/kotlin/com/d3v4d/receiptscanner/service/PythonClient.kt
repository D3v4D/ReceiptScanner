package com.d3v4d.receiptscanner.service

import org.springframework.http.MediaType
import org.springframework.http.client.MultipartBodyBuilder
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.web.reactive.function.BodyInserters
import org.springframework.web.reactive.function.client.WebClient
import org.springframework.web.multipart.MultipartFile
import org.springframework.web.reactive.function.client.bodyToMono
import org.springframework.core.io.ByteArrayResource

@Service
class PythonClient(
    @Value("\${python-service.base-url:http://localhost:8000}") baseUrl: String,
) {

    private val webClient = WebClient.create(baseUrl)

    fun sendImage(file: MultipartFile): String {

        val builder = MultipartBodyBuilder()
        val imageResource = object : ByteArrayResource(file.bytes) {
            override fun getFilename(): String {
                return file.originalFilename ?: "image"
            }
        }

        builder.part("image", imageResource)
            .filename(file.originalFilename ?: "image")
            .contentType(file.contentType?.let { MediaType.parseMediaType(it) } ?: MediaType.APPLICATION_OCTET_STREAM)

        return webClient.post()
            .uri("/process")
            .contentType(MediaType.MULTIPART_FORM_DATA)
            .body(BodyInserters.fromMultipartData(builder.build()))
            .retrieve()
            .bodyToMono<String>()
            .block() ?: throw IllegalStateException("Python service returned an empty response body")
    }
}