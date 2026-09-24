package com.sunshinemedical.api.repository;

import com.sunshinemedical.api.entity.Organization;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrganizationRepository extends JpaRepository<Organization, Long> {
}
