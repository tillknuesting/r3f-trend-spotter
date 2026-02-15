package analysis

import (
	"math"
	"sort"
)

// CalculateGravity applies Newton's Law of Cooling (Hacker News style).
// Score = (Points - 1) / (AgeInHours + 2)^Gravity
// Default Gravity is usually 1.8.
func CalculateGravity(baseScore float64, ageHours float64) float64 {
	// Prevent division by zero or negative ages
	if ageHours < 0 {
		ageHours = 0
	}

	// We use 1.8 as the standard gravity factor
	gravity := 1.8

	// Ensure baseScore is at least 1 to avoid negative results in standard formula,
	// though here we just decay the input score directly.
	// Formula: decayed = score / pow(age+2, gravity)
	return baseScore / math.Pow(ageHours+2, gravity)
}

// CalculateMedian returns the median of a slice of float64.
func CalculateMedian(values []float64) float64 {
	if len(values) == 0 {
		return 0
	}

	// Make a copy to avoid sorting the original
	cpy := make([]float64, len(values))
	copy(cpy, values)
	sort.Float64s(cpy)

	n := len(cpy)
	if n%2 == 1 {
		return cpy[n/2]
	}
	return (cpy[n/2-1] + cpy[n/2]) / 2.0
}

// CalculateMAD returns the Median Absolute Deviation.
func CalculateMAD(values []float64) float64 {
	median := CalculateMedian(values)
	var deviations []float64
	for _, v := range values {
		deviations = append(deviations, math.Abs(v-median))
	}
	return CalculateMedian(deviations)
}

// CalculateModifiedZScore determines how many deviations a value is from the median.
// Standard Z-score uses Mean/SD, which is sensitive to outliers.
// Modified Z-score uses Median/MAD, which is robust.
// Formula: 0.6745 * (x - median) / MAD
func CalculateModifiedZScore(value, median, mad float64) float64 {
	if mad == 0 {
		return 0
	}
	return 0.6745 * (value - median) / mad
}
