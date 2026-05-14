package com.d3v4d.receiptscanner.controller

import com.d3v4d.receiptscanner.dto.request.CategoryRequestDTO
import com.d3v4d.receiptscanner.dto.response.CategoryResponseDTO
import com.d3v4d.receiptscanner.service.CategoryService
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/categories")
class CategoryController(
    private val categoryService: CategoryService,
) {
    @GetMapping
    fun getCategories(): List<CategoryResponseDTO> {
        return categoryService.getCategories()
    }

    @GetMapping("/{id}")
    fun getCategory(@PathVariable("id") id: Long): CategoryResponseDTO {
        return categoryService.getCategory(id)
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun postCategory(
        @RequestBody request: CategoryRequestDTO,
    ): CategoryResponseDTO {
        return categoryService.createCategory(request)
    }

    @PutMapping("/{id}")
    fun putCategory(
        @PathVariable("id") id: Long,
        @RequestBody request: CategoryRequestDTO,
    ): CategoryResponseDTO {
        return categoryService.updateCategory(id, request)
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteCategory(@PathVariable("id") id: Long) {
        categoryService.deleteCategory(id)
    }
}
