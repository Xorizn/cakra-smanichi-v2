// src/app/about/page.tsx
"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Heart,
  Award,
  Users,
  Shield,
  Workflow,
  Globe,
  Flame,
} from "lucide-react";
import Link from "next/link";

export default function AboutPage() {
  const [activeIndex, setActiveIndex] = useState(0);

  const values = [
    {
      icon: <Heart className="h-12 w-12 text-[#5dc7ee]" />,
      title: "Kemanusiaan",
      description:
        "Mengutamakan nilai-nilai kemanusiaan dalam setiap tindakan.",
    },
    {
      icon: <Award className="h-12 w-12 text-[#f4bd39]" />,
      title: "Kesukarelaan",
      description: "Bergerak atas dasar keikhlasan tanpa pamrih.",
    },
    {
      icon: <Users className="h-12 w-12 text-[#5dc7ee]" />,
      title: "Persatuan",
      description: "Membangun kerjasama dan solidaritas dalam kebersamaan.",
    },
    {
      icon: <Shield className="h-12 w-12 text-[#5dc7ee]" />,
      title: "Kemandirian",
      description:
        "Mengembangkan kapasitas dan kemampuan diri secara berkelanjutan.",
    },
    {
      icon: <Globe className="h-12 w-12 text-[#5dc7ee]" />,
      title: "Universalitas",
      description: "Menjunjung tinggi prinsip kemanusiaan tanpa diskriminasi.",
    },
    {
      icon: <Workflow className="h-12 w-12 text-[#5dc7ee]" />,
      title: "Kenetralan",
      description: "Bersikap netral dalam setiap situasi dan kondisi.",
    },
  ];

  const activities = [
    "Pelatihan Pertolongan Pertama",
    "Kegiatan Donor Darah",
    "Sosialisasi Hidup Sehat",
    "Simulasi Tanggap Bencana",
    "Bakti Sosial",
    "Penyuluhan Kesehatan",
  ];

  return (
    <div className="container mx-auto py-12 px-4">
      {/* Hero Section */}
      <section className="relative py-12 mb-16 bg-gradient-to-r from-[#2192cd] to-[#5dc7ee] rounded-3xl overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-repeat opacity-20"></div>
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center text-center text-white p-6">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            PMR Wira SMA N 1 Bangli
          </h1>
          <div className="flex items-center mb-8">
            <Flame className="h-6 w-6 mr-2 text-[#f4bd39]" />
            <h2 className="text-xl md:text-2xl italic">CAKRA smanichi</h2>
          </div>
          <p className="max-w-3xl text-lg mb-8">
            Selalu siap siaga di garis terdepan untuk menjunjung tinggi prinsip
            kemanusiaan dan menolong sesama. Berkomitmen untuk menyebarkan dan
            melaksanakan perilaku berperikemanusiaan melalui aksi
            kepalangmerahan dan menjadi relawan dengan sepenuh hati.
          </p>
          <div className="bg-white/20 backdrop-blur-sm px-6 py-3 rounded-full font-bold text-xl">
            Do the best, yes we can!
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="mb-24">
        <div className="flex flex-col md:flex-row gap-12 items-center">
          <div className="md:w-1/2">
            <h2 className="text-3xl font-bold mb-4">Tentang Kami</h2>
            <p className="text-lg mb-6">
              PMR Wira SMA N 1 Bangli adalah organisasi kepalangmerahan yang
              bernaung di bawah Palang Merah Indonesia. Kami terdiri dari
              siswa-siswi SMA N 1 Bangli yang memiliki dedikasi tinggi dalam
              bidang kemanusiaan dan pertolongan pertama.
            </p>
            <p className="text-lg mb-6">
              Sebagai bagian dari Palang Merah Remaja tingkat Wira
              (SMA/SMK/sederajat), kami aktif dalam berbagai kegiatan
              kepalangmerahan baik di lingkungan sekolah, masyarakat, maupun
              dalam event-event tertentu.
            </p>
            <p className="text-lg">
              Nama CAKRA smanichi menjadi identitas yang melambangkan semangat
              dan tekad kami untuk terus berputar dan bergerak dalam membantu
              sesama, seperti cakra yang tak pernah berhenti.
            </p>
          </div>
          <div className="md:w-1/2 bg-[#ECEFF1] rounded-2xl overflow-hidden shadow-lg">
            <img
              src="/bg.png"
              alt="PMR Wira SMA N 1 Bangli"
              className="w-full h-auto object-cover"
            />
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="mb-24">
        <h2 className="text-3xl font-bold mb-12 text-center">
          Nilai-Nilai Kami
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {values.map((value, index) => (
            <Card
              key={index}
              className="border-2 hover:border-[#5dc7ee] transition-colors duration-300"
            >
              <CardHeader className="flex flex-col items-center">
                {value.icon}
                <CardTitle className="mt-4">{value.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p>{value.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Activities Section */}
      <section className="mb-24">
        <div className="bg-[#ECEFF1] rounded-3xl p-8 md:p-12">
          <h2 className="text-3xl font-bold mb-8 text-center">Kegiatan Kami</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activities.map((activity, index) => (
              <div
                key={index}
                className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 flex items-center"
              >
                <div className="w-10 h-10 rounded-full bg-[#5dc7ee] text-white flex items-center justify-center mr-4">
                  {index + 1}
                </div>
                <span className="font-medium">{activity}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Join Us Section */}
      <section className="text-center">
        <h2 className="text-3xl font-bold mb-6">Bergabunglah Bersama Kami</h2>
        <p className="text-lg max-w-2xl mx-auto mb-8">
          Jika kamu adalah siswa yang memiliki semangat
          kemanusiaan tinggi dan ingin berkontribusi dalam kegiatan
          kepalangmerahan, bergabunglah dengan PMR Wira SMA N 1 Bangli!
        </p>
        <Link href="https://chat.whatsapp.com/CXZhyghU8RvFrvKByJeUBi?mode=ems_copy_c">
        <Button
          size="lg"
          className="bg-[#5dc7ee] hover:bg-[#4ab5dc] text-white"
        >
          Bergabung Group Whatsapp
        </Button>
        </Link>
      </section>
    </div>
  );
}
