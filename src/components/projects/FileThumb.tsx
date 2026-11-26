"use client";

import { useEffect, useMemo, useState } from "react";
import { isImageFileName } from "@/lib/files";
import { getProjectFileUrls } from "@/lib/store";

type FileThumbProps = {
  name: string;
  file?: File;
  path?: string;
  src?: string;
  onPreview?: (src: string) => void;
};

/** 이미지 확장자만 40px 썸네일로 보여준다. 다른 파일은 자리를 차지하지 않는다. */
export default function FileThumb({
  name,
  file,
  path,
  src,
  onPreview,
}: FileThumbProps) {
  const [pathUrl, setPathUrl] = useState("");
  const image = isImageFileName(name);
  const objectUrl = useMemo(
    () => (image && file ? URL.createObjectURL(file) : ""),
    [image, file],
  );

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  useEffect(() => {
    if (src !== undefined || !image || !path) return;
    let active = true;
    getProjectFileUrls([path])
      .then((urls) => {
        if (active) setPathUrl(urls[0] ?? "");
      })
      .catch(() => {
        if (active) setPathUrl("");
      });
    return () => {
      active = false;
    };
  }, [src, image, path]);

  const url = src !== undefined ? src : objectUrl || pathUrl;
  if (!image || !url) return null;

  const thumb = (
    // 서명 URL 호스트는 실행마다 달라져 next/image 설정에 넣지 않는다.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      width={40}
      height={40}
      className="h-10 w-10 shrink-0 rounded-[2px] border border-line object-cover"
    />
  );

  if (!onPreview) return thumb;
  return (
    <button
      type="button"
      onClick={() => onPreview(url)}
      aria-label={`${name} 크게보기`}
      className="shrink-0 rounded-[2px]"
    >
      {thumb}
    </button>
  );
}
