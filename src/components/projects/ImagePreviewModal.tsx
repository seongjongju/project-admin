"use client";

import Modal from "@/components/ui/Modal";

type ImagePreviewModalProps = {
  name: string;
  src: string;
  onClose: () => void;
};

/** 이미지 원본을 비율대로 크게 보여준다. 다운로드는 상세 목록에만 둔다. */
export default function ImagePreviewModal({
  name,
  src,
  onClose,
}: ImagePreviewModalProps) {
  return (
    <Modal title={name} onClose={onClose} wide>
      <div className="flex justify-center">
        {/* 서명 URL 호스트는 실행마다 달라 next/image 설정에 넣지 않는다. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={name}
          className="block h-auto max-h-[min(720px,70dvh)] w-auto max-w-full object-contain"
        />
      </div>
    </Modal>
  );
}
