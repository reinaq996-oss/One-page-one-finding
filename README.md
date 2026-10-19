# One-page-one-finding
# Student Performance Analysis

## Project Overview

This project explores the factors associated with students' final grades using the Student Performance dataset. The analysis focuses on previous grades, weekly study time, and the number of past class failures to understand how they relate to academic performance.

## Dataset

- **Dataset:** Student Performance (Portuguese language course)
- **Number of students:** 649
- **Schools:** Two Portuguese secondary schools
- **Data source:** Student Performance dataset
- **Main file:** `student-por.csv`

## Objectives

The main objectives of this project are to:

- Investigate the relationship between previous grades and final grades.
- Analyze the association between weekly study time and academic performance.
- Examine how previous class failures relate to final grades.
- Communicate the findings through clear and informative visualizations.
- Identify limitations in the data and avoid confusing correlation with causation.

## Tools and Technologies

- Python
- Jupyter Notebook
- Pandas
- NumPy
- Matplotlib
- Seaborn

## Key Findings

### 1. Previous Grades

Previous grades are strongly associated with final grades.

- The correlation between G1 (first-period grade) and G3 (final grade) is approximately **0.83**.
- The correlation between G2 (second-period grade) and G3 is approximately **0.92**.

G2 has a stronger correlation with the final grade than G1.

### 2. Weekly Study Time

The analysis compares average final grades across different reported weekly study-time categories.

Students reporting 5–10 hours of weekly study time have an average final grade of approximately **13.23** out of 20.

This pattern suggests an association between reported study time and academic performance, but it does not establish a causal relationship.

### 3. Previous Class Failures

Students with no previous class failures have an average final grade of approximately **12.51**.

Students with previous failures generally show lower average final grades, with the analyzed groups averaging approximately **8.07–8.81**.

## Visualizations

The notebook uses visualizations to communicate the results, including:

- Correlation comparisons between previous and final grades.
- Average final grades across weekly study-time categories.
- Average final grades grouped by the number of previous class failures.

## Limitations

- Correlation does not imply causation.
- The dataset cannot explain every student's academic outcome.
- Some observations require further investigation. For example, 15 students have a final grade of zero despite having no recorded absences.
- Group averages do not describe every individual student's performance.

## Conclusion

The analysis indicates that previous grades are the strongest of the examined indicators associated with final grades. Weekly study time and previous class failures also show meaningful patterns.

These findings can help identify factors associated with academic performance, but they should not be used to define a student's potential or predict an individual's future with certainty.

## Project Structure

```text
Student-Performance/
├── Student_Performance.ipynb
├── student-por.csv
└── README.md
```

## Authors

- Gjergj Garuli
- Sejbi Koromani
- Reina Qose

