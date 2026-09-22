package com.sunshine.api.repository;

import com.sunshine.api.entity.AppointmentRule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AppointmentRuleRepository extends JpaRepository<AppointmentRule, Long> {
  Optional<AppointmentRule> findFirstByOrderByIdAsc();
}