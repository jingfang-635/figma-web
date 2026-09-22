package com.sunshine.api.repository;

import com.sunshine.api.entity.OrgSetting;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrgSettingRepository extends JpaRepository<OrgSetting, Long> {
}