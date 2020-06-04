SELECT t2.age, t3.age age2
FROM (
    SELECT IF (COALESCE(IF (ISNULL(COALESCE(IF (FIND_IN_SET("", CONCAT_WS(",", "")), "", NULL))), 0, 1)) <> 0, MAIN.age, NULL) AS age 
    FROM table2 AS MAIN  
    WHERE COALESCE(IF (ISNULL(COALESCE(IF (FIND_IN_SET("", CONCAT_WS(",", "")), "", NULL))), 0, 1)) <> 0
) t2 
LEFT JOIN (
    SELECT IF (COALESCE(IF (ISNULL(COALESCE(IF (FIND_IN_SET("", CONCAT_WS(",", "")), "", NULL))), 0, 1)) <> 0, MAIN.age, NULL) AS age 
    FROM table2 AS MAIN  
    WHERE COALESCE(IF (ISNULL(COALESCE(IF (FIND_IN_SET("", CONCAT_WS(",", "")), "", NULL))), 0, 1)) <> 0
) t3 on t2.age = t3.age
where t3.age = 30