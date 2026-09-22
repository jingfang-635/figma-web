package com.sunshine.api.repository;

import com.sunshine.api.entity.Schedule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ScheduleRepository extends JpaRepository<Schedule, Long> {
  List<Schedule> findByDateBetweenOrderByDateAscIdAsc(String start, String end);
  long countByDoctorIdAndDate(Long doctorId, String date);
}