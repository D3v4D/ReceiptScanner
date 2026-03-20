package com.d3v4d.receiptscanner.service

import org.springframework.http.MediaType
import org.springframework.http.client.MultipartBodyBuilder
import org.springframework.stereotype.Service
import org.springframework.web.reactive.function.BodyInserters
import org.springframework.web.reactive.function.client.WebClient
import org.springframework.web.multipart.MultipartFile
import org.springframework.web.reactive.function.client.bodyToMono

@Service
class PythonClient {

    private val webClient = WebClient.create("http://localhost:8000")

    fun sendImage(file: MultipartFile): String {

        val builder = MultipartBodyBuilder()
        builder.part("image", file.resource)

        return webClient.post()
            .uri("/process")
            .contentType(MediaType.MULTIPART_FORM_DATA)
            .body(BodyInserters.fromMultipartData(builder.build()))
            .retrieve()
            .bodyToMono<String>()
            .block()!!
    }
}