package com.d3v4d.receiptscanner.service

import com.d3v4d.receiptscanner.entity.ProductAliasEntity
import com.d3v4d.receiptscanner.entity.ProductEntity
import com.d3v4d.receiptscanner.repository.ProductAliasRepository
import com.d3v4d.receiptscanner.repository.ProductRepository
import org.springframework.stereotype.Service
import kotlin.math.max
import kotlin.math.min

/**
 * Matches a raw OCR product name to a known ProductEntity using fuzzy string matching.
 *
 * Strategy (in order):
 *  1. Exact alias match          → use existing product, high confidence
 *  2. Normalized trigram similarity against product names and aliases → best match above threshold
 *  3. No good match             → create a new ProductEntity and record an alias
 *
 * Every successful fuzzy match that is new gets stored as a ProductAliasEntity so future
 * identical OCR strings resolve instantly (learning behaviour).
 */
@Service
class FuzzyProductMatchService(
    private val productRepository: ProductRepository,
    private val productAliasRepository: ProductAliasRepository,
) {

    companion object {
        /** Minimum similarity [0..100] to accept a fuzzy match instead of creating a new product. */
        const val MATCH_THRESHOLD = 60
    }

    /**
     * Returns a [ProductEntity] for the given raw OCR name.
     * May create and persist a new [ProductEntity] and/or [ProductAliasEntity].
     */
    fun resolve(rawName: String): ProductEntity {
        val normalised = normalise(rawName)

        // 1️- Exact alias lookup (fast path)
        productAliasRepository.findByAlias(normalised)
            ?.product
            ?.let { return it }

        // 2️- Fuzzy match against all known products and aliases
        val products  = productRepository.findAll()
        val aliases   = productAliasRepository.findAll()

        var bestProduct: ProductEntity? = null
        var bestScore   = 0

        for (product in products) {
            val score = similarity(normalised, normalise(product.name))
            if (score > bestScore) {
                bestScore   = score
                bestProduct = product
            }
        }
        for (alias in aliases) {
            val score = similarity(normalised, normalise(alias.alias))
            if (score > bestScore) {
                bestScore   = score
                bestProduct = alias.product
            }
        }

        return if (bestProduct != null && bestScore >= MATCH_THRESHOLD) {
            // ✅ Good match — persist alias so next time it's a fast path
            persistAlias(rawName = normalised, product = bestProduct, confidence = bestScore)
            bestProduct
        } else {
            // ❌ No match — create a brand new product and seed its first alias
            val newProduct = productRepository.save(ProductEntity(name = toCanonicalName(normalised)))
            persistAlias(rawName = normalised, product = newProduct, confidence = 100)
            newProduct
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Normalise a raw OCR string:
     *  1. Lowercase
     *  2. Apply OCR homoglyph substitutions (0↔o, 1↔l/i, 5↔s, etc.) so both
     *     the stored name and the query are compared in the same canonical form.
     *  3. Strip remaining OCR artifacts (pipe, backslash)
     *  4. Collapse whitespace
     */
    private fun normalise(s: String): String =
        s.lowercase()
            .applyOcrHomoglyphs()
            .replace(Regex("[|\\\\]"), "")
            .replace(Regex("\\s+"), " ")
            .trim()

    /**
     * Replaces common OCR digit↔letter confusions with a single canonical character
     * so that e.g. "0LIIVE" and "OLIVE" both normalise to "olive".
     *
     * Canonical choices (always prefer the letter form):
     *   0       → o
     *   1, !, | → l  (pipe / exclamation are almost always a mis-read l or I)
     *   i       → l  (collides with l in many receipt fonts)
     *   3       → e
     *   4       → a  (handwritten / stylised)
     *   5, $    → s
     *   6       → g
     *   7       → t
     *   8       → b
     *   @       → a
     *   2       → z
     */
    private fun String.applyOcrHomoglyphs(): String {
        val sb = StringBuilder(length)
        for (ch in this) {
            sb.append(
                when (ch) {
                    '0'            -> 'o'
                    '1', '!', 'i' -> 'l'
                    '3'            -> 'e'
                    '4'            -> 'a'
                    '5', '$'       -> 's'
                    '6'            -> 'g'
                    '7'            -> 't'
                    '8'            -> 'b'
                    '@'            -> 'a'
                    '2'            -> 'z'
                    else           -> ch
                }
            )
        }
        return sb.toString()
    }

    /**
     * Convert a normalised alias into a human-readable canonical product name
     * (capitalise first letter of each word).
     */
    private fun toCanonicalName(s: String): String =
        s.split(" ").joinToString(" ") { word ->
            word.replaceFirstChar { it.uppercaseChar() }
        }

    /**
     * Trigram-based Jaccard similarity, blended with normalised Levenshtein distance.
     * Returns a value in [0, 100].
     */
    fun similarity(a: String, b: String): Int {
        if (a == b) return 100
        if (a.isEmpty() || b.isEmpty()) return 0

        val trigramScore  = trigramJaccard(a, b)
        val levenScore    = levenshteinSimilarity(a, b)
        // Weighted blend: trigrams are more robust to character-level OCR noise
        return ((trigramScore * 0.6) + (levenScore * 0.4)).toInt()
    }

    /** Jaccard similarity over character trigrams, in [0, 100]. */
    private fun trigramJaccard(a: String, b: String): Double {
        val tA = trigrams(a)
        val tB = trigrams(b)
        if (tA.isEmpty() && tB.isEmpty()) return 100.0
        if (tA.isEmpty() || tB.isEmpty()) return 0.0
        val intersection = (tA intersect tB).size
        val union        = (tA union tB).size
        return (intersection.toDouble() / union.toDouble()) * 100.0
    }

    private fun trigrams(s: String): Set<String> {
        if (s.length < 3) return setOf(s)
        return (0..s.length - 3).map { s.substring(it, it + 3) }.toSet()
    }

    /** Levenshtein similarity normalised to [0, 100]. */
    private fun levenshteinSimilarity(a: String, b: String): Double {
        val dist     = levenshtein(a, b)
        val maxLen   = max(a.length, b.length)
        return (1.0 - dist.toDouble() / maxLen) * 100.0
    }

    /** Standard Levenshtein distance. */
    private fun levenshtein(a: String, b: String): Int {
        val dp = Array(a.length + 1) { IntArray(b.length + 1) }
        for (i in 0..a.length) dp[i][0] = i
        for (j in 0..b.length) dp[0][j] = j
        for (i in 1..a.length) {
            for (j in 1..b.length) {
                dp[i][j] = if (a[i - 1] == b[j - 1]) dp[i - 1][j - 1]
                else min(dp[i - 1][j - 1], min(dp[i - 1][j], dp[i][j - 1])) + 1
            }
        }
        return dp[a.length][b.length]
    }

    private fun persistAlias(rawName: String, product: ProductEntity, confidence: Int) {
        // Avoid duplicate aliases
        if (productAliasRepository.findByAlias(rawName) == null) {
            productAliasRepository.save(
                ProductAliasEntity(alias = rawName, confidence = confidence, product = product)
            )
        }
    }
}


