package com.sunshine.api.repository;

import com.sunshine.api.entity.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FeedbackRepository extends JpaRepository<Feedback, Long> {
  long countByStatus(String status);
}