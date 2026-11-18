"use client";

import { useModalStore } from "@/stores/useModalStore";
import { DynamicModal } from "@/components/shared/DynamicModal";
import { PackageForm } from "@/features/catalog/components/PackageForm";
import { ServiceForm } from "@/features/catalog/components/ServiceForm";
import { ConfirmModalContent } from "@/components/shared/ConfirmModalContent";
import { MemberForm } from "@/features/members/components/MemberForm";
import { CoachForm } from "@/features/coaches/components/CoachForm";
import { ScheduleForm } from "@/features/schedules/components/ScheduleForm";

export function AdminModalHost() {
  const { isOpen, type, props, closeModal } = useModalStore();

  let title = "";
  let description = "";
  let content = null;

  switch (type) {
    case "package-form":
      title = props.packageData ? "Ubah Paket" : "Tambah Paket Baru";
      description = "Silakan isi detail paket latihan di bawah ini.";
      content = <PackageForm packageData={props.packageData} />;
      break;

    case "service-form":
      title = props.serviceData ? "Edit Layanan" : "Tambah Layanan";
      description = "Silakan isi detail layanan di bawah ini.";
      content = <ServiceForm serviceData={props.serviceData} />;
      break;

    case "confirm":
      title = props.title || "Konfirmasi Tindakan";
      description = props.description || "Apakah Anda yakin?";
      content = (
        <ConfirmModalContent
          message={props.message}
          onConfirm={props.onConfirm}
          isSubmitting={props.isSubmitting}
        />
      );
      break;

    case "member-form":
      title = "Ubah Status Pengguna";
      description = "Ubah hak akses keanggotaan pengguna ini.";
      content = <MemberForm memberData={props.memberData} />;
      break;

    case "coach-form":
      title = props.coachData ? "Ubah Pelatih" : "Tambah Pelatih Baru";
      description =
        "Masukkan profil pelatih dan relasi layanan yang ditangani.";
      content = <CoachForm coachData={props.coachData} />;
      break;

    case "schedule-form":
      title = props.scheduleData ? "Ubah Jadwal" : "Buat Jadwal Baru";
      description = "Atur waktu, pelatih, dan kapasitas maksimal sesi latihan.";
      content = <ScheduleForm scheduleData={props.scheduleData} />;
      break;

    default:
      return null;
  }

  return (
    <DynamicModal
      isOpen={isOpen}
      onClose={closeModal}
      title={title}
      description={description}>
      {content}
    </DynamicModal>
  );
}
