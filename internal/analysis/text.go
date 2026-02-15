package analysis

import (
	"math"
	"strings"
	"unicode"
)

// TextAnalyzer handles advanced text scoring using BM25.
type TextAnalyzer struct {
	documents    []string // content of all trends
	avgDocLength float64
	docCount     int64
	idfCache     map[string]float64
}

func NewTextAnalyzer(corpus []string) *TextAnalyzer {
	ta := &TextAnalyzer{
		documents: corpus,
		docCount:  int64(len(corpus)),
		idfCache:  make(map[string]float64),
	}

	if ta.docCount > 0 {
		totalLen := 0
		for _, doc := range corpus {
			totalLen += len(Tokenize(doc))
		}
		ta.avgDocLength = float64(totalLen) / float64(ta.docCount)
	}

	return ta
}

// Tokenize split text into words, treating punctuation as separators, and lowercasing.
func Tokenize(text string) []string {
	f := func(c rune) bool {
		return !unicode.IsLetter(c) && !unicode.IsNumber(c)
	}
	fields := strings.FieldsFunc(text, f)
	var tokens []string
	for _, field := range fields {
		// Basic stopword filtering could go here, but for now we keep it simple
		// or allow BM25 to handle frequent words naturally via IDF.
		if len(field) > 1 { // Skip single characters
			tokens = append(tokens, strings.ToLower(field))
		}
	}
	return tokens
}

// CalculateIDF computes Inverse Document Frequency for a term.
// IDF(q) = log( (N - n(q) + 0.5) / (n(q) + 0.5) + 1 )
func (ta *TextAnalyzer) CalculateIDF(term string) float64 {
	if val, ok := ta.idfCache[term]; ok {
		return val
	}

	n := 0 // number of docs containing term
	for _, doc := range ta.documents {
		// Simple containment check. For strict correctness, check tokens.
		// Using tokens for accuracy.
		tokens := Tokenize(doc)
		for _, t := range tokens {
			if t == term {
				n++
				break
			}
		}
	}

	// Standard BM25 IDF formula
	idf := math.Log((float64(ta.docCount)-float64(n)+0.5)/(float64(n)+0.5) + 1.0)
	ta.idfCache[term] = idf
	return idf
}

// ScoreBM25 calculates the relevance of a document to a query (set of keywords).
// k1 = 1.2, b = 0.75 (standard constants)
func (ta *TextAnalyzer) ScoreBM25(doc string, keywords []string) float64 {
	if ta.docCount == 0 {
		return 0
	}

	tokens := Tokenize(doc)
	docLen := float64(len(tokens))
	score := 0.0
	k1 := 1.2
	b := 0.75

	// Frequency of each term in the document
	freqs := make(map[string]float64)
	for _, t := range tokens {
		freqs[t]++
	}

	for _, term := range keywords {
		term = strings.ToLower(term)
		tf := freqs[term]
		if tf == 0 {
			continue
		}

		idf := ta.CalculateIDF(term)

		numerator := tf * (k1 + 1)
		denominator := tf + k1*(1-b+b*(docLen/ta.avgDocLength))

		score += idf * (numerator / denominator)
	}

	return score
}
