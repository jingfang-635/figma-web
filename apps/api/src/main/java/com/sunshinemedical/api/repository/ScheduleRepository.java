package com.sunshinemedical.api.repository;

import com.sunshinemedical.api.entity.Schedule;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ScheduleRepository extends JpaRepository<Schedule, Long> {
}
