import { useRef, useState } from 'react';
import { ImagePlus, Camera, X, Play, CircleAlert, Info } from 'lucide-react';

export const CATEGORIES = [
  'Broken Streetlight',
  'Flooding',
  'Sewage',
  'Pothole',
  'Damaged Park',
  'Damaged Building',
  'Other',
];
const MAX_FILES = 5;
const mb = (bytes) => (bytes / (1024 * 1024)).toFixed(1);

export default function UploadCard({ files, errors, onAdd, onRemove, onDismissError }) {
  const [drag, setDrag] = useState(false);
  const browseRef = useRef(null);
  const camRef = useRef(null);

  const pick = (e) => {
    onAdd(e.target.files);
    e.target.value = '';
  };

  return (
    <section className="card" aria-labelledby="upload-title">
      <div className="card-head">
        <span className="step-badge">1</span>
        <div>
          <h2 id="upload-title">Add Photo / Video</h2>
          <p className="muted">Optional · A little context helps.</p>
        </div>
      </div>

      <div
        className={`dropzone ${drag ? 'is-drag' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          onAdd(e.dataTransfer.files);
        }}
      >
        <span className="icon-tile">
          <ImagePlus size={22} />
        </span>
        <p className="dz-title desk-only">Drag photos or video here</p>
        <p className="dz-title mob-only">Add a photo or short video</p>
        <p className="muted small desk-only">or choose a file from your device</p>
        <p className="muted small mob-only">Choose from your library or use your camera.</p>
        <div className="dz-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => browseRef.current.click()}>
            Browse files
          </button>
          <button type="button" className="btn btn-secondary btn-sm mob-only-flex" onClick={() => camRef.current.click()}>
            <Camera size={18} /> Take photo
          </button>
        </div>
        <p className="muted tiny">
          JPG, PNG, HEIC, MP4 or MOV
          <br />
          Up to {MAX_FILES} files · Max 25MB each
        </p>
        <input ref={browseRef} type="file" hidden multiple accept=".jpg,.jpeg,.png,.heic,.mp4,.mov,image/*,video/*" onChange={pick} />
        <input ref={camRef} type="file" hidden accept="image/*" capture="environment" onChange={pick} />
      </div>

      {files.length > 0 && (
        <div className="files">
          <div className="files-head">
            <span>YOUR FILES</span>
            <span>
              {files.length} of {MAX_FILES} added
            </span>
          </div>
          {files.map((f) => (
            <div key={f.id} className="file-card">
              <div className="thumb">
                {f.isVideo ? <video src={f.preview} muted preload="metadata" /> : <img src={f.preview} alt="" onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />}
                {f.isVideo && (
                  <span className="thumb-play">
                    <Play size={16} fill="currentColor" />
                  </span>
                )}
              </div>
              <div className="file-info">
                <strong>{f.name}</strong>
                <span className={f.status === 'error' ? 'text-error' : 'muted'}>
                  {mb(f.size)}MB ·{' '}
                  {f.status === 'done' ? 'Upload complete' : f.status === 'error' ? 'Upload failed. Remove it and try again.' : `Uploading ${f.progress}%`}
                </span>
                <div className="progress" role="progressbar" aria-valuenow={f.progress} aria-valuemin="0" aria-valuemax="100">
                  <span className={f.status === 'error' ? 'bar-error' : ''} style={{ width: `${f.progress}%` }} />
                </div>
              </div>
              <button className="icon-btn" onClick={() => onRemove(f.id)} aria-label={`Remove ${f.name}`}>
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {errors.map((e) => (
        <div key={e.id} className="alert alert-error" role="alert">
          <CircleAlert size={20} />
          <div>
            <strong>{e.title}</strong>
            <span>{e.text}</span>
          </div>
          <button className="icon-btn" onClick={() => onDismissError(e.id)} aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      ))}
      {errors.length > 0 && (
        <button type="button" className="btn btn-secondary full" onClick={() => browseRef.current.click()}>
          Choose another file
        </button>
      )}

      <p className="note">
        <Info size={16} /> No photo? No problem. You can still make a report.
      </p>
    </section>
  );
}
